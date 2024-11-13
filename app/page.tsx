'use client'

import LoginPage from "./pages/login/login";
import SignupPage from "./pages/login/signup";
import { useState } from "react";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = () => {
    setIsLogin(!isLogin);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4">
        {/* Header/Logo Area */}
        <div className="pt-8 pb-6 text-center">
          <h1 className="text-4xl font-bold text-gray-800">
            Welcome
          </h1>
          <div className="mt-4">
            <button
              onClick={toggleForm}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Auth Component */}
        {isLogin ? <LoginPage /> : <SignupPage />}

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Your Company. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}