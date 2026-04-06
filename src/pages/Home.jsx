import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import movieService from '../services/movieService';

function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    movieService.getPublicMovies({ page: 0, size: 6 })
      .then(res => setMovies(res.data?.currentItems || res.data || []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mt-5">
      {/* Banner */}
      <div id="movieCarousel" className="carousel slide mb-5 shadow rounded overflow-hidden" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200&h=400"
              className="d-block w-100 object-fit-cover" alt="Banner 1" style={{height: '400px'}} />
            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-3">
              <h5>Trải Nghiệm Điện Ảnh Đỉnh Cao</h5>
              <p>Hệ thống rạp chiếu phim hiện đại nhất với âm thanh vòm sống động.</p>
            </div>
          </div>
          <div className="carousel-item">
            <img src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=1200&h=400"
              className="d-block w-100 object-fit-cover" alt="Banner 2" style={{height: '400px'}} />
            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-3">
              <h5>Bom Tấn Của Năm</h5>
              <p>Cập nhật những bộ phim mới nhất từ Hollywood.</p>
            </div>
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#movieCarousel" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#movieCarousel" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
        </button>
      </div>

      {/* Movies Listing */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-2">
        <h2 className="text-light m-0">Phim Đang Chiếu</h2>
        <Link to="/movies" className="text-danger fw-bold text-decoration-none">Xem thêm &raquo;</Link>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status" />
        </div>
      ) : (
        <div className="row g-4 mb-5">
          {movies.map(movie => (
            <div key={movie.id} className="col-12 col-sm-6 col-md-4 col-lg-4">
              <div className="card h-100 bg-dark text-white border-secondary shadow-sm">
                <img
                  src={movie.posterUrl || movie.imageUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400'}
                  className="card-img-top object-fit-cover" alt={movie.title} style={{height: '350px'}} />
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title text-truncate" title={movie.title}>{movie.title}</h5>
                  <p className="card-text text-muted mb-2">
                    <small>{movie.genres?.map(g => g.name).join(', ') || movie.genre}</small>
                  </p>
                  <div className="mt-auto d-flex gap-2">
                    <button className="btn btn-outline-light w-50" onClick={() => navigate(`/movies/${movie.id}`)}>Chi Tiết</button>
                    <button className="btn btn-danger w-50" onClick={() => navigate(`/movies/${movie.id}`)}>Đặt Vé</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {movies.length === 0 && (
            <div className="col-12 text-center text-secondary py-5">Chưa có phim nào đang chiếu.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;
