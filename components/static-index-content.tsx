export function StaticIndexContent() {
  return (
    <div className="index-page">
      <div className="index-page-header">
        <h1 className="main-title">Felix Restaurants</h1>
      </div>
      <div className="index-page-content">
        <div className="restaurant-grid">
          <div className="restaurant-card">
            <div className="restaurant-card-image">
              <img src="/assets/beach1.jpeg" alt="Beach Restaurant" />
            </div>
            <div className="restaurant-card-content">
              <h2>Beach Restaurant</h2>
              <p>Enjoy fresh seafood with your feet in the sand</p>
              <a href="/reserve?restaurant=Beach%20Restaurant" className="btn btn-primary">
                Reserve
              </a>
            </div>
          </div>
          <div className="restaurant-card">
            <div className="restaurant-card-image">
              <img src="/assets/marina1.jpeg" alt="Marina Restaurant" />
            </div>
            <div className="restaurant-card-content">
              <h2>Marina Restaurant</h2>
              <p>Elegant dining with stunning harbor views</p>
              <a href="/reserve?restaurant=Marina%20Restaurant" className="btn btn-primary">
                Reserve
              </a>
            </div>
          </div>
          <div className="restaurant-card">
            <div className="restaurant-card-image">
              <img src="/assets/selimiye1.jpeg" alt="Selimiye Restaurant" />
            </div>
            <div className="restaurant-card-content">
              <h2>Selimiye Restaurant</h2>
              <p>Traditional flavors in a charming village setting</p>
              <a href="/reserve?restaurant=Selimiye%20Restaurant" className="btn btn-primary">
                Reserve
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
