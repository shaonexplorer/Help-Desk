import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchHello } from './api';

export function App() {
  const [message, setMessage] = useState<string>('Loading…');

  useEffect(() => {
    fetchHello()
      .then(({ message }) => setMessage(message))
      .catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight">Help Desk</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button>Get started</Button>
    </div>
  );
}
