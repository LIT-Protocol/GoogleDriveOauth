import App from './App'
import Link from './Link'

function Router() {
    if (window.location.pathname === "/") {
	return <App />
    }
    else if (window.location.pathname.includes("/l/")) {
	return <Link />
    }
}

export default Router;
