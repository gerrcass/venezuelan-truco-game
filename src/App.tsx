import { LocaleProvider } from './content/LocaleProvider';
import { GameProvider } from './game/GameProvider';
import { Mesa } from './components/Mesa';

export function App() {
  return (
    <LocaleProvider>
      <GameProvider>
        <Mesa />
      </GameProvider>
    </LocaleProvider>
  );
}
