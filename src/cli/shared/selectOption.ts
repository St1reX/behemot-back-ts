import { clearScreenDown, cursorTo, emitKeypressEvents, Key, moveCursor } from 'readline';

interface Option<T> {
    label: string;
    value: T;
}

export async function selectOption<T>(question: string, options: Option<T>[]): Promise<T | null> {
    const { stdin, stdout } = process;

    if (!stdin.isTTY || !stdout.isTTY) {
        throw new Error('Uruchom skrypt w interaktywnym terminalu.');
    }
    if (options.length === 0) {
        throw new Error('Brak dostępnych opcji do wyboru.');
    }

    const wasRaw = stdin.isRaw;
    const wasFlowing = stdin.readableFlowing;
    const pageSize = Math.max(1, Math.min(10, stdout.rows - 5));
    let selectedIndex = 0;
    let renderedLines = 0;

    function clearMenu() {
        if (renderedLines > 0) {
            moveCursor(stdout, 0, -renderedLines);
            cursorTo(stdout, 0);
            clearScreenDown(stdout);
            renderedLines = 0;
        }
    }

    function render() {
        clearMenu();
        const start = Math.floor(selectedIndex / pageSize) * pageSize;
        const lines = [
            question,
            '↑/↓ wybór · Enter zatwierdza · Esc/Ctrl+C anuluje',
            ...options.slice(start, start + pageSize).map((option, index) =>
                `${start + index === selectedIndex ? '>' : ' '} ${option.label}`,
            ),
            `${selectedIndex + 1} / ${options.length}`,
        ];
        // Keep each entry on one terminal line, including values read from the database.
        stdout.write(lines.map((line) => line.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').slice(0, Math.max(1, stdout.columns - 1))).join('\n') + '\n');
        renderedLines = lines.length;
    }

    emitKeypressEvents(stdin);

    return new Promise<T | null>((resolve, reject) => {
        function cleanup() {
            stdin.removeListener('keypress', onKeypress);
            stdin.setRawMode(wasRaw);
            if (wasFlowing !== true) stdin.pause();
            clearMenu();
        }

        function onKeypress(_input: string, key: Key) {
            try {
                if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
                    cleanup();
                    console.log('Anulowano.');
                    resolve(null);
                } else if (key.name === 'return') {
                    const selected = options[selectedIndex];
                    cleanup();
                    console.log(`${question} ${selected.label}`);
                    resolve(selected.value);
                } else if (key.name === 'up' || key.name === 'down') {
                    selectedIndex = (selectedIndex + (key.name === 'up' ? -1 : 1) + options.length) % options.length;
                    render();
                }
            } catch (error) {
                cleanup();
                reject(error);
            }
        }

        try {
            stdin.setRawMode(true);
            stdin.on('keypress', onKeypress);
            stdin.resume();
            render();
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
}
