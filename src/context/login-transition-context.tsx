import { createContext, useCallback, useContext, useState } from 'react';

interface LoginTransitionContextValue {
  active: boolean;
  userName: string;
  trigger: (name: string) => void;
  finish: () => void;
}

const LoginTransitionContext = createContext<LoginTransitionContextValue>({
  active: false,
  userName: '',
  trigger: () => {},
  finish: () => {},
});

export function LoginTransitionProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [userName, setUserName] = useState('');

  const trigger = useCallback((name: string) => {
    setUserName(name);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    setUserName('');
  }, []);

  return (
    <LoginTransitionContext.Provider value={{ active, userName, trigger, finish }}>
      {children}
    </LoginTransitionContext.Provider>
  );
}

export function useLoginTransition() {
  return useContext(LoginTransitionContext);
}
