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
                response_text: question.answer,
                date: student.date,
                link: student.link
            };
            var i = semester.sections[0].questions.findIndex(q => q.name === question.name);
            if (i !== -1) {
                semester.sections[0].questions[i].responses.push(response);
            } else {
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

function sortSemesters(data) {
    var semesters = [];
    data.forEach(semester => {
        var i = semesters.findIndex(sem => sem.name === semester.name);
        if (i !== -1) {
            var j = semesters[i].sections.findIndex(sec => sec.number === semester.sections[0].number);
            if (j !== -1) {
                semesters[i].sections[j].questions.concat(semester.sections[0].questions);
            } else {
                semesters[i].sections.push(semester.sections[0]);
            }
        } else {
            semesters.push(semester);
        }
    });

    return semesters;
}

module.exports = {
    sortSection,
    sortSemesters
};