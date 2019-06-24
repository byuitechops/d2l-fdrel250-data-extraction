// This function sorts a single link's information into the correct data structure
function sortSection(data) {
    var semester = {
        name: data[0].semester,
        sections: [{
            number: data[0].sections,
            course_id: data[0].course_id,
            questions: [
                // {
                //     name: '',
                //     text: '',
                //     responses: [
                //         {
                //             sis_user_id: '',
                //             response_text: '',
                //             date: '',
                //             link: ''
                //         }
                //     ]
                // }
            ]
        }]
    };

    data.forEach(student => {
        student.questions.forEach(question => {
            var response = {
                sis_user_id: student.sis_user_id,
                response_text: question.response_text,
                date: student.date,
                link: student.link
            };
            // does this section exist already?
            var i = semester.sections[0].questions.findIndex(q => q.name === question.name);
            if (i !== -1) {
                // if so push these responses in
                semester.sections[0].questions[i].responses.push(response);
            } else {
                // if not add the whole section
                semester.sections[0].questions.push({
                    name: question.name,
                    text: question.text,
                    responses: [response]
                });
            }
        });
    });

    return semester;
}

// This function is to be executed after bin.js has finished it's loop.
// It will sort every semester that has been scraped from all the links.
function sortSemesters(data) {
    var semesters = [];
    data.forEach(semester => {
        // does this semester exist?
        var i = semesters.findIndex(sem => sem.name === semester.name);
        if (i !== -1) {
            // if so, does this section exist?
            var j = semesters[i].sections.findIndex(sec => sec.number === semester.sections[0].number);
            if (j !== -1) {
                // if so push these responses in
                semesters[i].sections[j].questions.concat(semester.sections[0].questions);
            } else {
                // if not add this section
                semesters[i].sections.push(semester.sections[0]);
            }
        } else {
            // if not add this semester
            semesters.push(semester);
        }
    });

    return semesters;
}

module.exports = {
    sortSection,
    sortSemesters
};