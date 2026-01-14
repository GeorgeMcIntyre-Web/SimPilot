Robot List Parser (src/ingestion/robotListParser.ts)

Code Field                                      Expected Columns / Aliases
--------------------------------------------------------------------------------
robotCaption                                   ROBOT CAPTION | ROBOTS TOTAL | ROBOT | ROBO NO. NEW | ROBO NO. OLD | ROBOT NAME | NAME
stationCode                                    STATION | STATION CODE | STATION NUMBER | CELL
lineCode                                       LINE | LINE CODE | ASSEMBLY LINE
areaName                                       AREA | AREA NAME | INDEX
eNumber (metadata.serialNumber)                ROBOTNUMBER (E-NUMBER) | ROBOTNUMBER
oemModel                                       OEM MODEL | MODEL | TYPE | ROBOT TYPE | ROBOT TYPE CONFIRMED
metadata (unmapped headers)                    Any other non-empty header not consumed above (copied verbatim)

Robot Equipment List Parser (src/ingestion/robotEquipmentList/robotEquipmentListParser.ts)

Code Field                                      Expected Columns / Aliases
--------------------------------------------------------------------------------
robotId                                        Robo No. New
station                                        Station No.
personResponsible / area                       Person Responsible
bundle                                         Bundle
serialNumber                                   Serial #
robotKey                                       Robot Key
substituteRobot                                Substitute Robot
substituteSerialNumber                         Substitute Serial Number
substituteKey                                  Substitute Key
order                                          order
robotType                                      Robot Type
robotTypeConfirmed                             Robot Type Confirmed
robotOrderSubmitted                            Robot Order Submitted
cableChangeCutoff                              Cable Change Cutoff
comment                                        Comment
application                                    Function
applicationCode                                Code
installStatus                                  Install status
equipment-specific fields                      Numerous literal matches (e.g., Base Code, Track Length, Dress Pack fields, cable lengths, ESOW flags) are read verbatim from their column headers; see src/ingestion/robotEquipmentList/robotEquipmentListParser.ts for the full list.

Tool List Parser (src/ingestion/toolListParser.ts)

Code Field                                      Expected Columns / Aliases
--------------------------------------------------------------------------------
toolId                                         EQUIPMENT NO SHOWN | GUN ID | GUN NUMBER | TOOL ID | EQUIPMENT ID | GUN | TOOL | TOOL NAME | EQUIPMENT NO | EQUIPMENT | ID | NAME
type / subtype                                 TYPE | TOOL TYPE | GUN TYPE | SUBTYPE
oemModel                                       MODEL | OEM MODEL | MANUFACTURER | SUPPLIER
areaName                                       AREA | AREA NAME
lineCode                                       LINE | LINE CODE | ASSEMBLY LINE
stationCode                                    STATION | STATION CODE | CELL
reuseStatus                                    REUSE | REUSE STATUS | STATUS
comments                                       COMMENTS | COMMENT
notes                                          NOTES | NOTE
supply / refreshment                           SUPPLY | REFRESMENT OK
metadata (unmapped headers)                    Any other non-empty header not consumed above (copied verbatim)

Assemblies List Parser (src/ingestion/assembliesListParser.ts)

Code Field                                      Expected Columns / Aliases
--------------------------------------------------------------------------------
station (tool-station key)                     STATION | STATION NUMBER | STATION CODE | STN | STAND
toolNumber                                     TOOL NUMBER | TOOL | EQUIPMENT | DEVICE | ID | ITEM | PART | ASSEMBLY | COMPONENT | TOOL ID | EQUIPMENT ID | DEVICE ID | PART NUMBER | ITEM NUMBER
description                                    DESCRIPTION | DESC | NAME | TOOL NAME | ITEM DESC | PART NAME
area                                           AREA | AREA NAME | UNIT | LOCATION
progress stages                                Any column matching NOT STARTED, 1ST STAGE, 2ND STAGE, DETAILING, CHECKING, ISSUED, COMPLETE (case-insensitive); parser also captures other percentage/date-looking progress columns dynamically
metadata (unmapped headers)                    Remaining columns are captured into metadata for reference

Simulation Status Parser (src/ingestion/simulationStatusParser.ts)

Code Field                                      Expected Columns / Aliases
--------------------------------------------------------------------------------
area / line / station                          AREA | ASSEMBLY LINE | LINE | STATION (and their code/number variants)
application / technology                       APPLICATION | TECHNOLOGY (and variants)
personResponsible                              PERSONS RESPONSIBLE | RESPONSIBLE (and similar)
stage completion metrics                       Columns such as 1st STAGE SIM COMPLETION, FINAL DELIVERABLES, ROBOT POSITION, COLLISION CHECKS, DCS CONFIGURED, DRESS PACK CONFIGURED, plus other stage/date/percent columns; parser scores and maps many stage/status fields dynamically
notes / comments                               COMMENT / NOTES (as present)
metadata                                       Unconsumed columns are retained in metadata

Cross-cutting glossary
- Canonical field IDs, synonyms, and regexes used across ingestion are defined in src/excel/fieldRegistry.ts. Use that file as the authoritative list of field names and aliases.
