'use client';

import { createCartStore } from './cart-store';

/** Lighting purchases have their own persistence and never consume the store cart. */
export const useFadoCart = createCartStore('ecom-casa-fado-cart');
export const FADO_CHECKOUT_DRAFT_KEY = 'ecom-fado-checkout-draft';
