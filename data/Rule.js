class Rule {
    id;
    condition;
    value;
    terrainId;

    constructor(id = 0, condition, value, terrainId = 0)
    {   this.id = id;
        this.condition = condition;
        this.value = value;
        this.terrainId = terrainId
    }

    toJSON() {
        return {
        id: this.id,
        condition: this.condition,
        value: this.value,
        terrainId: this.terrainId
        };
    }
}

module.exports = Rule;