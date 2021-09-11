import App from './App'
import Link from './Link'

function Router() {
    if (window.location.pathname.includes("/l/")) {
	return <Link />
    }
    else {
	return <App />
    }	     
}

export default Router;
