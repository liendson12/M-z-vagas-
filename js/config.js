// Preencha com os dados do seu projeto Supabase
// (Project Settings > API). A chave "anon" é pública e segura de expor
// porque o acesso é protegido pelas regras RLS do schema.sql.
// NUNCA coloque a chave "service_role" aqui.
window.JOBBOARD_CONFIG = {
  SUPABASE_URL: "https://dfjhxuikdkveciyywrqp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmamh4dWlrZGt2ZWNpeXl3cnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NjU4MjQsImV4cCI6MjExMDA0MTgyNH0.rbPYulgOA296zXufVFt-zKTZj4YzFrIl6P_v4IcMZSs",
  SITE_NAME: "Quadro de Vagas",

  // Anúncios (Google AdSense). Deixe ADSENSE_CLIENT vazio para não mostrar anúncios.
  ADS: {
    ENABLED: true,
    ADSENSE_CLIENT: "",                       // ex.: "ca-pub-1234567890123456"
    SLOTS: { top: "", list: "", bottom: "" }, // IDs dos blocos de anúncio (só números)
  },
};
