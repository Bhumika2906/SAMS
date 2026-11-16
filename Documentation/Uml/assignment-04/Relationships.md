# SAMS — Assignment 4: Class Relationships

This document records the relationships and multiplicities visible in the supplied class diagram. It does not add relationships that are not shown in the image.

## 1. Generalization / inheritance

- `Applicant` inherits from `User`.
- `Verifier` inherits from `User`.
- `Administrator` inherits from `User`.

## 2. Associations and multiplicities

| Classes | Relationship / multiplicity shown |
|---|---|
| `User` — `Notification` | One `User` is associated with zero or more `Notification` objects (`1` to `0..*`). |
| `Applicant` — `Application` | One applicant is associated with one application (`1` to `1`). |
| `Application` — `Document` | One application can contain zero or more documents (`1` to `0..*`). |
| `Application` — `Payment` | One application is associated with one payment (`1` to `1`) in the diagram. |
| `Application` — `SeatAllotment` | The diagram shows an association between `Application` and `SeatAllotment`; multiplicities are shown on the diagram and should be read together with the image. |
| `Application` — `DigitalChecklist` | The diagram shows an association between `Application` and `DigitalChecklist`. |
| `AdmissionRound` — `SeatAllotment` | An admission round can be associated with zero or more seat allotments (`1` to `0..*`). |
| `SeatAllotment` — `AdmissionDecision` | The diagram shows an association between `SeatAllotment` and `AdmissionDecision`. |
| `DigitalChecklist` — `ChecklistItem` | A digital checklist is composed of one or more checklist items; the composition is indicated by a filled diamond. |
| `QRGatePass` and `SeatAllotment` / `DigitalChecklist` | Dashed dependency arrows are shown from `SeatAllotment` toward `QRGatePass` and from `DigitalChecklist` toward `QRGatePass`. |
| `Administrator` — `AdmissionRound` | The administrator is associated with admission-round management. |
| `Administrator` — `Report` | The administrator is associated with zero or more reports (`1` to `0..*`). |

## 3. Other diagram elements

- `Notification` provides `send()` and `markRead()` operations.
- `Report` provides `generate()` and `export()` operations.
- `AdmissionDecision` provides `recordDecision()`.

The original class diagram, including all connectors, arrowheads, and multiplicity labels, is preserved as `diagrams/Class-Diagram.png`.
