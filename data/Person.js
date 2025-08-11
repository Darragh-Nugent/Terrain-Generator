class Person {
    id;
    uName;
    password;

    constructor(id, uName, pass)
    {      
        this.id = id;
        this.uName = uName;
        this.password = pass;
    }
}

module.exports = Person;