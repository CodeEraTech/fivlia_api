const generateInvoiceHTML = (order, user) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fivlia Invoice</title>
  <style>
    body { font-family: sans-serif; padding: 40px; }
    h1 { text-align: center; color: #333; }
    .info { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
    .total { text-align: right; font-weight: bold; }
  </style>
</head>
<body>
  <h1>FIVLIA INVOICE</h1>
  <div class="info">
    <p><strong>Customer:</strong> ${user.name}</p>
    <p><strong>Mobile:</strong> ${user.mobileNumber}</p>
    <p><strong>Order ID:</strong> ${order.orderId}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th><th>Qty</th><th>Price</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>₹${item.price}</td>
          <td>₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <p class="total">Total Amount: ₹${order.totalPrice}</p>
</body>
</html>
  `;
};
