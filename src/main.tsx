import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import store from "./store";
import { injectStore } from "./config/axios.config";

// Import CSS
import "./assets/styles/variables.css";
import "./styles/global.less";
import "./styles/antd-custom.less";
import "./assets/styles/antd-override.css"; // Ensure overrides are loaded


// Inject store vào axios config để tránh circular dependency
injectStore(store);

const rootElement = document.getElementById("root");

if (rootElement) {
  console.log("Found root element, attempting to render...");
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <Provider store={store}>
        <HelmetProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HelmetProvider>
      </Provider>
    );
    console.log("Render called successfully");
  } catch (err) {
    console.error("Critical Error during render:", err);
    rootElement.innerHTML = `<div style="color: red; padding: 20px;">
      <h1>Critical Error</h1>
      <pre>${err instanceof Error ? err.message + '\n' + err.stack : String(err)}</pre>
    </div>`;
  }
} else {
  console.error("Root element not found!");
  document.body.innerHTML = "<h1>Root element not found!</h1>";
}
