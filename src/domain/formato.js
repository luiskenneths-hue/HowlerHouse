export const money = (n) => '₡ ' + String(Math.round(Math.abs(Number(n)) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const miles = (digitos) => String(digitos ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
