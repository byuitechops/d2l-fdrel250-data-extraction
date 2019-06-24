# Project Capture Document for D2L FDREL250 Data Extraction
#### *Author: Emma Fisher, Seth Bolander*
#### *Stakeholder: Matthew Zachreson*
#### *Date: April 26, 2019*


## Background

Matthew needs the results of all of a ceratin quiz, and D2L doesn't allow us to grab that information with their API. 
It would be very time consuming to do it by hand.

-----

## Definition of Done

We are creating a puppeteer tool to get the responses to a specific quiz in all sections and semesters of FDREL 250 within D2L
which will automate the process of collecting quiz responses.

-----

# Requirements

### General Requirements
A JSON generated with all the response data from the 250 Toolkit Assessment Quiz in every FDREL 250 course in every semester that
is in D2L.

### Input Requirements

#### Definition of Inputs
The course code that we want to get quiz response information from: FDREL 250

#### Source of Inputs
Matthew Zachreson simply told me.

---

### Output Requirements

#### Definition of Outputs

JSON
```json
{
    "Semester": {
        "name": "WINTER 2018",
        "sections": [
            {
                "number": [
                    "01",
                    "02"
                ],
                "course_id": "00123",
                "questions": [
                    {
                        "name": "question01",
                        "text": "Who am I?",
                        "responses": [
                            {
                                "sis_user_id": 123456789,
                                "response_text": "nbfjdnh",
                                "date": "Dec 25, 2018",
                                "link": "www."
                            },
                            {
                                "sis_user_id": 123456789,
                                "response_text": "nbfjdnh",
                                "date": "Jan 1, 2018",
                                "link": "www."
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
  
```

#### Destination of Outputs

Directly to Brother Zachreson.

---

### User Interface

#### Type:

CLI

-----

## Expectations

### Timeline

Milestone 1: By April 28, present Brother Zachreson with a list of all courses that contain the certain quiz to see if it looks good to him
Milestone 2: By April 3, deliver the final JSON file to Brother Zachreson

### Best Mode of Contact
Email

### Next Meeting
None

### Action Items
Get a list of courses for Brother Zachreson to check, then complete the rest of the project.
#### TechOps
#### Stakeholder

-----

#### *Approved By: Joshua McKinney* 
#### *Approval Date: 3/26/2019*
