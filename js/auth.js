export const Auth = {
  async getSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signIn(client, email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signOut(client) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async loadCloudDatabase(client, userId) {
    const { data, error } = await client
      .from('flota_cloud_store')
      .select('db_data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.db_data ?? null;
  },

  async saveCloudDatabase(client, userId, database) {
    const { error } = await client
      .from('flota_cloud_store')
      .upsert({
        user_id: userId,
        db_data: database,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  }
};
