export const STORAGE_KEY = 'miflota_rd_prod_v1';

const COLLECTIONS = [
  'trucks',
  'drivers',
  'helpers',
  'routes',
  'trips',
  'scheduledTrips',
  'maintenances',
  'incidents'
];

const FINANCIAL_FIELDS = {
  trips: ['freightGross', 'fuelCost', 'tollsCost', 'driverPay', 'helperPay', 'otherCost', 'clientsCount'],
  scheduledTrips: ['freightGross', 'fuelCost', 'tollsCost', 'driverPay', 'helperPay', 'otherCost', 'clientsCount'],
  maintenances: ['cost'],
  incidents: ['cost']
};

function normalizeNonNegative(value) {
  if (value === '' || value === null || value === undefined) return value;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeRecord(collectionName, record) {
  const normalized = record && typeof record === 'object' ? { ...record } : {};
  for (const field of FINANCIAL_FIELDS[collectionName] || []) {
    if (field in normalized) normalized[field] = normalizeNonNegative(normalized[field]);
  }

  if (collectionName === 'trucks') {
    normalized.status = normalized.status === 'En Taller / Fuera de Servicio' ||
      normalized.status === 'Fuera de Servicio'
      ? 'En Taller / Fuera de Servicio'
      : 'Disponible';
  }
  return normalized;
}

export function createEmptyDatabase() {
  return {
    ...Object.fromEntries(COLLECTIONS.map((collection) => [collection, []])),
    profile: { companyName: '', passwordChanged: false }
  };
}

function getCollection(database, collectionName) {
  if (!COLLECTIONS.includes(collectionName)) {
    throw new Error(`Colección de base de datos desconocida: ${collectionName}`);
  }
  return database[collectionName];
}

export function addRecord(database, collectionName, record, prepend = false) {
  const collection = getCollection(database, collectionName);
  const normalized = normalizeRecord(collectionName, record);
  if (prepend) collection.unshift(normalized);
  else collection.push(normalized);
  return normalized;
}

export function updateRecord(database, collectionName, id, changes) {
  const collection = getCollection(database, collectionName);
  const index = collection.findIndex((record) => String(record.id) === String(id));
  if (index === -1) throw new Error(`No existe el registro ${id} en ${collectionName}.`);
  collection[index] = normalizeRecord(collectionName, { ...collection[index], ...changes });
  return collection[index];
}

export function deleteRecord(database, collectionName, id) {
  const collection = getCollection(database, collectionName);
  const index = collection.findIndex((record) => String(record.id) === String(id));
  if (index === -1) return false;
  collection.splice(index, 1);
  return true;
}

export function normalizeDatabase(value) {
  const source = value && typeof value === 'object' ? value : {};
  const database = createEmptyDatabase();

  for (const collection of COLLECTIONS) {
    database[collection] = Array.isArray(source[collection])
      ? source[collection].map((record) => normalizeRecord(collection, record))
      : [];
  }

  database.profile = source.profile && typeof source.profile === 'object'
    ? { companyName: String(source.profile.companyName || '') }
    : { companyName: '' };
  if (typeof source.profile?.passwordChanged === 'boolean') {
    database.profile.passwordChanged = source.profile.passwordChanged;
  }
  return database;
}

export function loadLocalDatabase() {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) return createEmptyDatabase();
  return normalizeDatabase(JSON.parse(serialized));
}

export function saveLocalDatabase(database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeDatabase(database)));
}

export async function loadDatabase(user, auth) {
  try {
    const cloudDatabase = await auth.loadCloudDatabase(user.id);
    if (cloudDatabase && Object.keys(cloudDatabase).length > 0) {
      const database = normalizeDatabase(cloudDatabase);
      saveLocalDatabase(database);
      return { database, cloudError: null, isNewDatabase: false };
    }
    const localDatabaseExists = localStorage.getItem(STORAGE_KEY) !== null;
    if (localDatabaseExists) {
      return { database: loadLocalDatabase(), cloudError: null, isNewDatabase: false };
    }
    return { database: createEmptyDatabase(), cloudError: null, isNewDatabase: true };
  } catch (cloudError) {
    const localDatabaseExists = localStorage.getItem(STORAGE_KEY) !== null;
    return {
      database: localDatabaseExists ? loadLocalDatabase() : createEmptyDatabase(),
      cloudError,
      isNewDatabase: !localDatabaseExists
    };
  }
}

export async function saveDatabase(database, user, auth, onCloudStatus) {
  const normalized = normalizeDatabase(database);
  saveLocalDatabase(normalized);

  if (!user) return { cloudSynced: false };

  onCloudStatus?.('saving');
  try {
    await auth.saveCloudDatabase(user.id, normalized);
    onCloudStatus?.('synced');
    return { cloudSynced: true };
  } catch (error) {
    onCloudStatus?.('offline');
    console.error('No se pudo sincronizar con Supabase; los datos quedaron guardados localmente.', error);
    return { cloudSynced: false, error };
  }
}
