import React from 'react';
import { Link } from 'react-router-dom';

const dummyMovies = [
  { id: 1, title: 'Dune: Part Two', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400', genre: 'Sci-Fi, Adventure', rating: '8.8' },
  { id: 2, title: 'Oppenheimer', image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=400', genre: 'Biography, Drama', rating: '8.5' },
  { id: 3, title: 'Avenger: Endgame', image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=400', genre: 'Action, Sci-Fi', rating: '8.4' },
  { id: 4, title: 'Inception', image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=400', genre: 'Action, Sci-Fi', rating: '8.8' },
  { id: 5, title: 'Interstellar', image: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?auto=format&fit=crop&q=80&w=400', genre: 'Action, Sci-Fi', rating: '8.6' },
  { id: 6, title: 'The Dark Knight', image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&q=80&w=400', genre: 'Action, Crime', rating: '9.0' },
];

function Home() {
  return (
    <div className="container mt-5">
      {/* Banner/Carousel Section */}
      <div id="movieCarousel" className="carousel slide mb-5 shadow rounded overflow-hidden" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1200&h=400" className="d-block w-100 object-fit-cover" alt="Banner 1" style={{height: '400px'}} />
            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-3">
              <h5>Trải Nghiệm Điện Ảnh Đỉnh Cao</h5>
              <p>Hệ thống rạp chiếu phim hiện đại nhất với âm thanh vòm sống động.</p>
            </div>
          </div>
          <div className="carousel-item">
            <img src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=1200&h=400" className="d-block w-100 object-fit-cover" alt="Banner 2" style={{height: '400px'}} />
            <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-3">
              <h5>Bom Tấn Của Năm</h5>
              <p>Cập nhật những bộ phim mới nhất từ Hollywood.</p>
            </div>
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#movieCarousel" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#movieCarousel" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </button>
      </div>

      {/* Movies Listing */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-2">
        <h2 className="text-light m-0">Phim Đang Chiếu</h2>
        <span className="text-danger fw-bold">Xem thêm &raquo;</span>
      </div>

      <div className="row g-4 mb-5">
        {dummyMovies.map(movie => (
          <div key={movie.id} className="col-12 col-sm-6 col-md-4 col-lg-4">
            <div className="card h-100 bg-dark text-white border-secondary shadow-sm hover-shadow transition">
              <img src={movie.image} className="card-img-top object-fit-cover" alt={movie.title} style={{height: '350px'}} />
              <div className="card-body d-flex flex-column">
                <h5 className="card-title text-truncate" title={movie.title}>{movie.title}</h5>
                <p className="card-text text-muted mb-2"><small>{movie.genre}</small></p>
                <div className="mb-3">
                  <span className="badge bg-warning text-dark me-2">IMDb {movie.rating}</span>
                </div>
                <div className="mt-auto d-flex gap-2">
                  <button className="btn btn-outline-light w-50">Trailer</button>
                  <button className="btn btn-danger w-50">Đặt Vé</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
