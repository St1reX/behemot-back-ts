import { z } from 'zod';

z.setErrorMap((issue) => {
    switch (issue.code) {
        case z.ZodIssueCode.invalid_type:
            return { message: issue.received === 'undefined' ? 'To pole jest wymagane.' : 'Nieprawidłowy typ wartości.' };
        case z.ZodIssueCode.invalid_string:
            return { message: issue.validation === 'email' ? 'Podaj poprawny adres e-mail.' : 'Nieprawidłowy format wartości.' };
        case z.ZodIssueCode.too_small:
            if (issue.type === 'array') return { message: `Wybierz co najmniej ${issue.minimum} elementów.` };
            if (issue.type === 'date') return { message: 'Wybrana data jest zbyt wczesna.' };
            return { message: issue.type === 'string'
                ? `Wpisz co najmniej ${issue.minimum} znaków.`
                : `Wartość musi być ${issue.inclusive ? 'większa lub równa' : 'większa niż'} ${issue.minimum}.` };
        case z.ZodIssueCode.too_big:
            if (issue.type === 'array') return { message: `Wybierz maksymalnie ${issue.maximum} elementów.` };
            if (issue.type === 'date') return { message: 'Wybrana data jest zbyt późna.' };
            return { message: issue.type === 'string'
                ? `Wpisz maksymalnie ${issue.maximum} znaków.`
                : `Wartość musi być ${issue.inclusive ? 'mniejsza lub równa' : 'mniejsza niż'} ${issue.maximum}.` };
        case z.ZodIssueCode.invalid_enum_value:
        case z.ZodIssueCode.invalid_literal:
            return { message: 'Wybierz jedną z dostępnych wartości.' };
        case z.ZodIssueCode.not_multiple_of:
            return { message: `Wartość musi być wielokrotnością ${issue.multipleOf}.` };
        default:
            return { message: 'Nieprawidłowa wartość.' };
    }
});
