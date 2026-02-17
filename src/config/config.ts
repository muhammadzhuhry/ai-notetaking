interface Config {
  baseURL: string;
}

export const AppConfig: Config = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
};
