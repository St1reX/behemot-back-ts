# Narzędzia CLI

Polecenia uruchamiaj z katalogu backendu. Korzystają z połączenia do bazy skonfigurowanego w `.env`.

| Polecenie | Działanie |
| --- | --- |
| `npm run db-seed` | Tworzy role systemowe i uprawnienia; nadpisuje uprawnienia ról `superadmin`, `admin` i `user` zgodnie z `seed/rolePrivilegesSeedConfig.ts`. |
| `npm run auth:assign-role` | Pozwala wybrać konto i nadać mu istniejącą rolę. Nie zmienia statusu aktywacji konta. |
| `npm run auth:grant-all-privileges` | Pozwala wybrać rolę, tworzy lub przywraca uprawnienia z konfiguracji aplikacji i nadaje je tej roli. Dotyczy to również uprawnień `ROLE` i `USER`. |

W skryptach `auth` wybieraj strzałkami ↑/↓ i zatwierdzaj Enterem. Esc lub Ctrl+C anuluje wybór bez zapisu. Długie listy są stronicowane automatycznie.

`auth` zawiera narzędzia do ręcznej zmiany dostępu, a `seed` — konfigurację i skrypt seedera. Generator Postmana i kopiowanie zasobów pozostają w głównym katalogu `cli`.

Ponowne uruchomienie `db-seed` przywraca skonfigurowany zestaw uprawnień ról systemowych, również jeśli wcześniej rozszerzono go skryptem `auth:grant-all-privileges`.
