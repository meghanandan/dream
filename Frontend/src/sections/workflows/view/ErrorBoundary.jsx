import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by Error Boundary:', error, errorInfo);
  }

  render() {
    const { hasError } = this.state; // Destructure state
    const { children } = this.props; // Destructure props

    if (hasError) {
      return <h1>Something went wrong. Please try again later.</h1>;
    }

    return children;
  }
}

export default ErrorBoundary;
