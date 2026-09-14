package com.infernolos;

enum NpcKind
{
    NIBBLER("nibbler", 1, 7691), BAT("bat", 2, 7692), BLOB("blob", 3, 7693),
    MAGE_BLOB("mageBlob", 1, 7694), RANGE_BLOB("rangeBlob", 1, 7695), MELEE_BLOB("meleeBlob", 1, 7696),
    MELEE("melee", 4, 7697), RANGER("ranger", 3, 7698, 7702), MAGER("mager", 4, 7699, 7703),
    JAD("jad", 5, 7700, 7704), HEALER("healer", 1, 7701, 7705);

    final String key;
    final int size;
    private final int[] ids;
    NpcKind(String key, int size, int... ids) { this.key = key; this.size = size; this.ids = ids; }
    static NpcKind fromId(int id)
    {
        for (NpcKind kind : values()) for (int candidate : kind.ids) if (candidate == id) return kind;
        return null;
    }
}
