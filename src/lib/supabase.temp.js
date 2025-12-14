  // Business Profile
  async getBusinessProfile() {
    const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .single();
    return { data, error };
},

  async updateBusinessProfile(updates) {
    const { data, error } = await supabase
        .from('business_profile')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select()
        .single();
    return { data, error };
},

  async uploadLogo(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file);

    if (uploadError) {
        return { error: uploadError };
    }

    const { data } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

    return { data: data.publicUrl };
},

  // KPI
  async getEmployeeKPI(userId, startDate, endDate) {
    const { data, error } = await supabase
        .rpc('calculate_kpi', {
            user_id: userId,
            start_date: startDate,
            end_date: endDate,
        });
    return { data, error };
},

  async getAllEmployeesKPI(startDate, endDate) {
    const { data, error } = await supabase
        .rpc('calculate_all_kpi', {
            start_date: startDate,
            end_date: endDate,
        });
    return { data, error };
},
};

export default supabase;
