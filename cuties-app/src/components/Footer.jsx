import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">cuties!</Link>
            <p className="footer-tagline">Find your people.</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <Link to="/directory">Directory</Link>
              <Link to="/">Communities</Link>
            </div>

            <div className="footer-column">
              <h4>Connect</h4>
              <a href="https://twitter.com/christineist" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="mailto:hello@cuties.app">Contact</a>
            </div>

            <div className="footer-column">
              <h4>Legal</h4>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Cuties. Made with care by{' '}
            <a href="https://twitter.com/christineist" target="_blank" rel="noopener noreferrer">
              @christineist
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
