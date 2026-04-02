function AppFooter() {
  return (
    <footer className="bg-black py-4 border-top" style={{ borderColor: '#333' }}>
      <div className="container text-center text-secondary">
        <p className="mb-0">&copy; {new Date().getFullYear()} MovieTicker Cinema. All rights reserved.</p>
        <p className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
          Địa chỉ: 1 Võ Văn Ngân, Linh Chiểu, Thủ Đức, TP. Hồ Chí Minh
        </p>
      </div>
    </footer>
  )
}

export default AppFooter
