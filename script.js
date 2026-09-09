// Dados do sistema
let data = {
  products: [],
  sales: [],
  clients: [{ name: 'Consumidor Final', debt: 0 }],
  cart: [],
  paymentMethod: 'dinheiro'
};

// Carregar dados
function loadData() {
  const saved = localStorage.getItem('andorinha-mix');
  if (saved) {
    data = JSON.parse(saved);
  }
}

// Salvar dados
function saveData() {
  localStorage.setItem('andorinha-mix', JSON.stringify(data));
}

// Inicializar
function init() {
  loadData();
  updateClock();
  setupEventListeners();
  loadClients();
  renderProducts();
  updateDashboard();
}

// Relógio
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentTime').textContent = time;
  setTimeout(updateClock, 30000);
}

// Event Listeners
function setupEventListeners() {
  // Abas
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Busca
  const searchProduct = document.getElementById('searchProduct');
  if (searchProduct) {
    searchProduct.addEventListener('keyup', renderProducts);
  }

  // Métodos de pagamento
  document.querySelectorAll('.payment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
      e.target.closest('.payment-btn').classList.add('active');
      data.paymentMethod = e.target.closest('.payment-btn').dataset.method;
    });
  });
}

// Trocar abas
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'fiados') {
    renderDebtTable();
  } else if (tabName === 'produtos') {
    renderProductsTable();
  } else if (tabName === 'venda') {
    renderProducts();
  }
}

// Renderizar produtos para venda
function renderProducts() {
  const container = document.getElementById('productsList');
  if (!container) return;

  const search = document.getElementById('searchProduct')?.value.toLowerCase() || '';
  const filtered = data.products.filter(p => 
    p.name.toLowerCase().includes(search) && p.quantity > 0
  );

  container.innerHTML = filtered.map(p => `
    <div class="product-item" onclick="addToCart('${p.id}')">
      <div>
        <div class="product-name">${p.name}</div>
        <small style="color: #999;">Est: ${p.quantity}</small>
      </div>
      <div class="product-price">${formatCurrency(p.price)}</div>
    </div>
  `).join('');
}

// Adicionar ao carrinho
function addToCart(productId) {
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  const cartItem = data.cart.find(c => c.id === productId);
  if (cartItem) {
    if (cartItem.quantity < product.quantity) {
      cartItem.quantity++;
    }
  } else {
    data.cart.push({ ...product, quantity: 1 });
  }
  renderCart();
}

// Renderizar carrinho
function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  container.innerHTML = data.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-qty">${item.quantity}x ${formatCurrency(item.price)}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">×</button>
    </div>
  `).join('');

  const total = data.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('cartTotal').textContent = formatCurrency(total);
}

// Remover do carrinho
function removeFromCart(productId) {
  data.cart = data.cart.filter(c => c.id !== productId);
  renderCart();
}

// Limpar carrinho
function clearCart() {
  data.cart = [];
  renderCart();
}

// Finalizar venda
function finishSale() {
  if (data.cart.length === 0) {
    showToast('⚠ Adicione produtos ao carrinho!');
    return;
  }

  const clientSelect = document.getElementById('clientSelect');
  const client = clientSelect?.value || 'Consumidor Final';
  const total = data.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const sale = {
    id: Date.now().toString(),
    date: new Date().toLocaleString('pt-BR'),
    items: JSON.parse(JSON.stringify(data.cart)),
    total: total,
    payment: data.paymentMethod,
    client: client
  };

  // Atualizar estoque
  data.cart.forEach(item => {
    const product = data.products.find(p => p.id === item.id);
    if (product) product.quantity -= item.quantity;
  });

  // Se for fiado, adicionar dívida
  if (data.paymentMethod === 'fiado') {
    let clientData = data.clients.find(c => c.name === client);
    if (!clientData) {
      clientData = { name: client, debt: 0 };
      data.clients.push(clientData);
    }
    clientData.debt = (clientData.debt || 0) + total;
  }

  data.sales.push(sale);
  data.cart = [];
  saveData();
  renderCart();
  renderProducts();
  updateDashboard();
  showToast('✓ Venda finalizada com sucesso!');
}

// Abrir modal de produto
function openProductModal(productId = null) {
  const product = productId ? data.products.find(p => p.id === productId) : null;
  
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <h2>${productId ? 'Editar Produto' : 'Novo Produto'}</h2>
    <form onsubmit="saveProduct(event, '${productId || ''}')">
      <div class="form-group">
        <label>Nome do Produto *</label>
        <input type="text" id="productName" class="form-control" value="${product?.name || ''}" required>
      </div>
      <div class="form-group">
        <label>Preço *</label>
        <input type="number" id="productPrice" class="form-control" step="0.01" value="${product?.price || 0}" required>
      </div>
      <div class="form-group">
        <label>Quantidade *</label>
        <input type="number" id="productQuantity" class="form-control" value="${product?.quantity || 0}" required>
      </div>
      <button type="submit" class="btn-primary btn-block">Salvar Produto</button>
      <button type="button" class="btn-secondary btn-block" onclick="closeModal()">Cancelar</button>
    </form>
  `;
  
  document.getElementById('modal').classList.add('active');
}

// Salvar produto
function saveProduct(e, productId) {
  e.preventDefault();
  
  const name = document.getElementById('productName').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const quantity = parseInt(document.getElementById('productQuantity').value);

  if (productId) {
    const product = data.products.find(p => p.id === productId);
    if (product) {
      product.name = name;
      product.price = price;
      product.quantity = quantity;
    }
  } else {
    data.products.push({
      id: Date.now().toString(),
      name,
      price,
      quantity
    });
  }

  saveData();
  closeModal();
  renderProductsTable();
  renderProducts();
  updateDashboard();
  showToast('✓ Produto salvo com sucesso!');
}

// Renderizar tabela de produtos
function renderProductsTable() {
  const container = document.querySelector('#produtos .table-responsive');
  if (!container) return;

  const search = document.getElementById('searchProductList')?.value.toLowerCase() || '';
  const filtered = data.products.filter(p => p.name.toLowerCase().includes(search));

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th>Preço</th>
          <th>Estoque</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${formatCurrency(p.price)}</td>
            <td>
              <span style="background: ${p.quantity <= 5 ? '#fee2e2' : '#dbeafe'}; color: ${p.quantity <= 5 ? '#991b1b' : '#1e40af'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                ${p.quantity}
              </span>
            </td>
            <td>
              <button class="btn-primary" onclick="openProductModal('${p.id}')" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">Editar</button>
              <button class="btn-secondary" onclick="deleteProduct('${p.id}')" style="padding: 6px 12px; font-size: 12px;">Deletar</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Deletar produto
function deleteProduct(productId) {
  if (confirm('Deseja deletar este produto?')) {
    data.products = data.products.filter(p => p.id !== productId);
    saveData();
    renderProductsTable();
    renderProducts();
    showToast('✓ Produto deletado!');
  }
}

// Renderizar tabela de fiados
function renderDebtTable() {
  const container = document.querySelector('#fiados .table-responsive');
  if (!container) return;

  const debtClients = data.clients.filter(c => c.debt > 0);
  const totalDebt = debtClients.reduce((sum, c) => sum + c.debt, 0);

  document.getElementById('totalDebtAmount').textContent = formatCurrency(totalDebt);
  document.getElementById('debtClientCount').textContent = debtClients.length;

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Dívida</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${debtClients.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${formatCurrency(c.debt)}</td>
            <td>
              <button class="btn-primary" onclick="receivePayment('${c.name}')" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">Receber</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Receber pagamento
function receivePayment(clientName) {
  const amount = prompt('Quanto deseja receber?');
  if (amount) {
    const client = data.clients.find(c => c.name === clientName);
    if (client) {
      const value = parseFloat(amount);
      if (value > 0 && value <= client.debt) {
        client.debt -= value;
        saveData();
        renderDebtTable();
        updateDashboard();
        showToast('✓ Pagamento recebido!');
      }
    }
  }
}

// Gerar PDF de fiados
function generateDebtPDF() {
  const debtClients = data.clients.filter(c => c.debt > 0);
  if (debtClients.length === 0) {
    showToast('⚠ Não há clientes com dívida aberta!');
    return;
  }

  const totalDebt = debtClients.reduce((sum, c) => sum + c.debt, 0);
  const now = new Date().toLocaleString('pt-BR');

  let html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #2563eb; text-align: center; margin-bottom: 10px; }
          .date { text-align: center; color: #999; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #2563eb; color: white; padding: 10px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9fafb; }
          .total { background: #2563eb; color: white; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <h1>🐦 Andorinha Mix</h1>
        <p class="date">Relatório de Fiados - ${now}</p>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Dívida</th>
            </tr>
          </thead>
          <tbody>
  `;

  debtClients.forEach(c => {
    html += `
      <tr>
        <td>${c.name}</td>
        <td>R$ ${c.debt.toFixed(2).replace('.', ',')}</td>
      </tr>
    `;
  });

  html += `
            <tr class="total">
              <td>TOTAL EM ABERTO</td>
              <td>R$ ${totalDebt.toFixed(2).replace('.', ',')}</td>
            </tr>
          </tbody>
        </table>
        <p class="footer">Documento gerado pelo Andorinha Mix</p>
      </body>
    </html>
  `;

  const opt = {
    margin: 10,
    filename: `fiados_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  html2pdf().set(opt).from(html).save();
  showToast('✓ PDF gerado com sucesso!');
}

// Carregar clientes
function loadClients() {
  const select = document.getElementById('clientSelect');
  if (!select) return;

  select.innerHTML = data.clients.map(c => `<option>${c.name}</option>`).join('');
}

// Atualizar dashboard
function updateDashboard() {
  const today = new Date().toLocaleDateString('pt-BR');
  const todaySales = data.sales.filter(s => s.date.startsWith(today.split('/')[2]));
  const salesToday = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalDebt = data.clients.reduce((sum, c) => sum + c.debt, 0);
  const receivedToday = todaySales.filter(s => s.payment !== 'fiado').reduce((sum, s) => sum + s.total, 0);

  document.getElementById('salesTodayValue').textContent = formatCurrency(salesToday);
  document.getElementById('productsCountValue').textContent = data.products.length;
  document.getElementById('debtTotalValue').textContent = formatCurrency(totalDebt);
  document.getElementById('cashTotalValue').textContent = formatCurrency(receivedToday);
}

// Fechar modal
function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

// Toast
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Inicializar
document.addEventListener('DOMContentLoaded', init);