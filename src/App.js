import LeafClassifier from "./Components/leaf-classifier";
import "./output.css";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-teal-50 to-white p-6">
      <header className="max-w-6xl mx-auto mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-emerald-800 mb-2">
          Leaf Classification System
        </h1>
        <p className="text-emerald-600">
          Capture or upload leaf images for instant classification
        </p>
      </header>

      <LeafClassifier />

      <footer className="max-w-6xl mx-auto mt-12 text-center text-emerald-600 text-sm">
        <p>© 2025 Leaf Classification System. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
