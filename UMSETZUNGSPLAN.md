# Umsetzungsplan für den Tilgungsplan-Rechner

Dieser Plan beschreibt die Schritte zur Entwicklung eines Angular-basierten Tilgungsplan-Rechners.

## Entscheidungen

*   **Keine Auslagerung der Logik in eine separate Bibliothek:**

    *   **Begründung:** *KISS (Keep It Simple, Stupid)*. Derzeit ist die Anwendung relativ klein und die Berechnungslogik spezifisch für diesen Rechner. Die Auslagerung in eine separate Bibliothek würde unnötige Komplexität und Overhead verursachen. Sollte die Logik in Zukunft in anderen Projekten wiederverwendet werden müssen, kann die Auslagerung immer noch erfolgen (Refactoring).
*   **Kein Interface für den `AmortizationService`:**

    *   **Begründung:** *YAGNI (You Ain't Gonna Need It)*. Es gibt derzeit keine Anforderung für verschiedene Implementierungen des `AmortizationService`. Die Implementierung eines Interfaces würde die Codebasis unnötig aufblähen und die Entwicklung verlangsamen. Sollte in Zukunft eine Notwendigkeit für verschiedene Implementierungen entstehen (z.B. für Testzwecke oder verschiedene Berechnungsmodelle), kann ein Interface nachträglich hinzugefügt werden.

## Schritte

1.  **Projektstruktur aufsetzen:**
    *   Erstellung der grundlegenden Angular-Projektstruktur mit den Komponenten `loan-form`, `amortization-table` und `summary`.
    *   Erstellung des `AmortizationService` für die Berechnungslogik.
    *   Definition der Datenmodelle (`LoanData`, `AmortizationEntry`, `SummaryData`).
2.  **LoanFormComponent implementieren:**
    *   Erstellung des Formulars zur Eingabe der Darlehensdaten.
    *   Implementierung der Validierung.
    *   Ausgabe der Formulardaten an die `AppComponent`.
3.  **AmortizationService implementieren:**
    *   Implementierung der Berechnungslogik für den Tilgungsplan.
    *   Implementierung der Zusammenfassungsberechnung.
    *   Implementierung der Validierungslogik.
4.  **AmortizationTableComponent implementieren:**
    *   Anzeige des Tilgungsplans in einer Tabelle.
    *   Formatierung der Daten (Datum, Währung).
5.  **SummaryComponent implementieren:**
    *   Anzeige der Zusammenfassungsdaten.
    *   Formatierung der Daten (Währung).
6.  **AppComponent implementieren:**
    *   Verbindung der Komponenten.
    *   Aufruf des `AmortizationService`.
    *   Übergabe der Daten an die `AmortizationTableComponent` und `SummaryComponent`.
7.  **Testen:**
    *   Manuelles Testen der Anwendung.
    *   Erstellung von Unit-Tests für den `AmortizationService`.
8.  **Refactoring (optional):**
    *   Überprüfung des Codes auf Verbesserungspotenzial.
    *   Refactoring zur Verbesserung der Lesbarkeit, Wartbarkeit und Testbarkeit.

## Prinzipien

*   **KISS (Keep It Simple, Stupid):** Vermeide unnötige Komplexität.
*   **YAGNI (You Ain't Gonna Need It):** Implementiere nur das, was tatsächlich benötigt wird.
*   **DRY (Don't Repeat Yourself):** Vermeide Code-Duplizierung.