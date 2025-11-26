import { Route, Signal } from '../types';

const STORAGE_KEY = 'greenwave_routes';

// Simulating an async backend service
export const saveRoute = async (route: Route): Promise<void> => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  const routes: Route[] = existingData ? JSON.parse(existingData) : [];
  
  const index = routes.findIndex(r => r.id === route.id);
  if (index >= 0) {
    routes[index] = route;
  } else {
    routes.push(route);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
};

export const getRoutes = async (): Promise<Route[]> => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  return existingData ? JSON.parse(existingData) : [];
};

export const getRouteById = async (id: string): Promise<Route | undefined> => {
  const routes = await getRoutes();
  return routes.find(r => r.id === id);
};

export const deleteRoute = async (id: string): Promise<void> => {
  const routes = await getRoutes();
  const filtered = routes.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};
