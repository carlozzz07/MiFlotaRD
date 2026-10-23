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

export function createEmptyDatabase() {
  return Object.fromEntries(COLLECTIONS.map((collection) => [collection, []]));
}

function getCollection(database, collectionName) {
  if (!COLLECTIONS.includes(collectionName)) {
    throw new Error(`Colección de base de datos desconocida: ${collectionName}`);
  }
  return database[collectionName];
}

export function addRecord(database, collectionName, record, prepend = false) {
  const collection = getCollection(database, collectionName);
  if (prepend) collection.unshift(record);
  else collection.push(record);
  return record;
}

export function updateRecord(database, collectionName, id, changes) {
  const collection = getCollection(database, collectionName);
  const index = collection.findIndex((record) => String(record.id) === String(id));
  if (index === -1) throw new Error(`No existe el registro ${id} en ${collectionName}.`);
  collection[index] = { ...collection[index], ...changes };
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
    database[collection] = Array.isArray(source[collection]) ? source[collection] : [];
  }

  database.trucks = database.trucks.map((truck) => ({
    ...truck,
    status: truck.status === 'Fuera de Servicio' ? truck.status : 'Disponible'
  }));

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
      return { database, cloudError: null };
    }
    return { database: loadLocalDatabase(), cloudError: null };
  } catch (cloudError) {
    return { database: loadLocalDatabase(), cloudError };
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
