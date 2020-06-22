
function extractValues(date) {
    return {
        year: date.getFullYear(),
        month: date.getMonth(),
        date: date.getDate()
    }
}

function isToday(date) {
    var today = extractValues(new Date());
    var value = extractValues(date);

    if (
        today.year !== value.year ||
        today.month !== value.month ||
        today.date !== value.date
    ) {
        return false;
    }

    return true;
}

module.exports = {
    test(val) {
        return val && typeof val === 'object' && 'getFullYear' in val
    },
    print(val) {
        if(isToday(val)) return "DATE NOW"
        var d = extractValues(val);
        return [d.year, d.month, d.date].join('-');
    },
}