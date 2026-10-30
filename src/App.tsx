import { LocaleProvider } from './content/LocaleProvider';
import { Mesa } from './components/Mesa';

export function App() {
  return (
    <LocaleProvider>
      <Mesa />
    </LocaleProvider>
  );
}
