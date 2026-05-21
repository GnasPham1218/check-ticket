export const ENV_API_BASE = import.meta.env.VITE_API_BASE || '';

export const API_BASE = (() => {
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalHost && ENV_API_BASE.includes('ngrok-free') ? '' : ENV_API_BASE;
})();

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const PROVINCES = [
  'An Giang',
  'Bạc Liêu',
  'Bến Tre',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cần Thơ',
  'Đà Lạt',
  'Đồng Nai',
  'Đồng Tháp',
  'Hậu Giang',
  'Kiên Giang',
  'Long An',
  'Sóc Trăng',
  'Tây Ninh',
  'Tiền Giang',
  'TP. HCM',
  'Trà Vinh',
  'Vĩnh Long',
  'Vũng Tàu',
  'Bình Định',
  'Đà Nẵng',
  'Đắk Lắk',
  'Đắk Nông',
  'Gia Lai',
  'Khánh Hòa',
  'Kon Tum',
  'Ninh Thuận',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Trị',
  'Huế',
  'Bắc Ninh',
  'Hà Nội',
  'Hải Phòng',
  'Nam Định',
  'Quảng Ninh',
  'Thái Bình',
];
