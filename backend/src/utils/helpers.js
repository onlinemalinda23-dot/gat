function generateJobCardNumber(id) {
  const ts = Date.now().toString(36).toUpperCase();
  const seq = String(id || Math.floor(Math.random() * 10000)).padStart(6, '0');
  return `JC-${seq}`;
}

function generateInvoiceNumber(id) {
  const seq = String(id || Math.floor(Math.random() * 10000)).padStart(6, '0');
  return `INV-${seq}`;
}

function paginate(queryStr, page, limit) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  return {
    page: safePage,
    limit: safeLimit,
    offset,
    meta: (totalRows) => ({
      total: Number(totalRows),
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(totalRows / safeLimit),
    }),
  };
}

module.exports = { generateJobCardNumber, generateInvoiceNumber, paginate };