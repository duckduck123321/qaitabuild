/**
 * Единая точка доступа к данным. Страницы импортируют только этот файл.
 *
 * Если в .env.local указаны VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY — работаем
 * с Supabase. Иначе — демо-режим: данные в браузере (src/lib/backend-local.ts).
 */
import * as local from "./backend-local";
import * as remote from "./backend-supabase";

export const isDemoMode = !remote.supabase;

const impl: typeof local = isDemoMode ? local : remote;

export const {
  getCurrentUser,
  register,
  login,
  logout,
  updateProfile,
  listListings,
  getListing,
  myListings,
  createListing,
  updateListing,
  deleteListing,
  categoryCounts,
  favoriteIds,
  toggleFavorite,
  favoriteListings,
  resetDemoData,
} = impl;
