# Narzędzia CLI

Polecenia uruchamiaj z katalogu backendu. Narzędzia do zarządzania rolami korzystają z połączenia do bazy skonfigurowanego w `.env`.

| Polecenie | Działanie |
| --- | --- |
| `npm run db-seed` | Tworzy role systemowe i uprawnienia; nadpisuje uprawnienia ról `superadmin`, `admin` i `user` zgodnie z `seed/rolePrivilegesSeedConfig.ts`. |
| `npm run auth:assign-role` | Pozwala wybrać konto i nadać mu istniejącą rolę. Nie zmienia statusu aktywacji konta. |
| `npm run auth:grant-all-privileges` | Pozwala wybrać rolę, tworzy lub przywraca uprawnienia z konfiguracji aplikacji i nadaje je tej roli. Dotyczy to również uprawnień `ROLE` i `USER`. |
| `npm run swagger-generate` | Generuje `src/swagger/swagger_output.json` z plików `src/modules/**/docs/*.docs.js` oraz wspólnych opisów w `src/swagger/docs`. Sprawdza zgodność listy metod i ścieżek z deklaracjami tras. Nie uruchamia API ani nie łączy się z bazą. |
| `npm run postman-generate` | Generuje `postman/behemot-api.postman_collection.json` z tras i przykładów w `generatePostmanCollection.ts`. Odczytuje konfigurację `.env` do ustawienia adresu API, ale nie łączy się z bazą ani nie wysyła żądań. |

W skryptach `auth` wybieraj strzałkami ↑/↓ i zatwierdzaj Enterem. Esc lub Ctrl+C anuluje wybór bez zapisu. Długie listy są stronicowane automatycznie.

`auth` zawiera narzędzia do ręcznej zmiany dostępu, a `seed` — konfigurację i skrypt seedera. Generator Postmana i kopiowanie zasobów pozostają w głównym katalogu `cli`.

Ponowne uruchomienie `db-seed` przywraca skonfigurowany zestaw uprawnień ról systemowych, również jeśli wcześniej rozszerzono go skryptem `auth:grant-all-privileges`.

Dokumentacja Swagger UI jest dostępna pod `/docs`. Po zmianie API aktualizuj plik `docs` odpowiedniego modułu i regeneruj oba pliki wynikowe. `npm run build` regeneruje Swagger, ale nie kolekcję Postmana. Generator Swagger zgłosi błąd przy brakującej lub nieistniejącej metodzie/ścieżce; zgodność pól, walidacji, odpowiedzi i uprawnień należy sprawdzić z kontrolerem, schematem i serwisem.

Uwierzytelnianie korzysta z sesji cookie `behemot-api-sid`, bez tokenów Bearer. W Postmanie najpierw wykonaj `POST /auth/login` i pozostaw włączony cookie jar. Przed operacjami zależnymi ustaw zmienne identyfikatorów zasobów. Skrypty kolekcji zapisują ID po utworzeniu zasobu; nie wykonują się podczas generowania kolekcji. Zmienne szablonów ogłoszeń, np. `{{customName}}`, są składnią API — nie definiuj ich jako zmiennych Postmana, jeśli mają trafić do backendu dosłownie.
