import React, { createContext, useContext, useReducer } from 'react';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  options?: {
    name: string;
    choices: string[];
  }[];
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: Record<string, string>;
  specialInstructions?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { menuItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
}>({
  state: { items: [], total: 0 },
  dispatch: () => null,
});

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.menuItem._id === action.payload.menuItem._id
      );

      let newItems;
      if (existingItemIndex > -1) {
        newItems = [...state.items];
        newItems[existingItemIndex].quantity += action.payload.quantity;
      } else {
        newItems = [...state.items, action.payload];
      }

      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0),
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(
        item => item.menuItem._id !== action.payload.menuItemId
      );
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0),
      };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.menuItem._id === action.payload.menuItemId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0),
      };
    }

    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
      };

    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext); 