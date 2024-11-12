import axios from 'axios';
import { showAlert } from './alert';

const stripe = Stripe(
  'pk_test_51Pg2hwSGtkU5jBf1HAkpWKe6YdSaC5Ozlr4GMYVvwvNUAZVKh4BA5BqQ1T2O71de8ihrNdO1jXRoJlUgs99K2yF1008Ono9oE1',
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from the API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );

    // 2) Create checkout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    
  } catch (error) {
    showAlert('error', error);
  }
};
