const { BOOSTER_ROLE_ID } = require('./xp'); // just for reference; not used here

// Ordered list of milestones: lowest → highest.
// Roles are added in this order; the 100+ entry applies from level 100 onward.
const LEVEL_ROLES = [
    { level: 5, roleId: '1570413298677977099' },
    { level: 10, roleId: '1570413297696510057' },
    { level: 15, roleId: '1570413296492879912' },
    { level: 20, roleId: '1570413295410749440' },
    { level: 25, roleId: '1570413293602869404' },
    { level: 30, roleId: '1570413292365545534' },
    { level: 35, roleId: '1570413291094675557' },
    { level: 40, roleId: '1570413289610018967' },
    { level: 45, roleId: '1570413288293146677' },
    { level: 50, roleId: '1570413287542362173' },
    { level: 55, roleId: '1570413286497976571' },
    { level: 60, roleId: '1570413285302468719' },
    { level: 65, roleId: '1570413283922673777' },
    { level: 70, roleId: '1570413282768982076' },
    { level: 75, roleId: '1570413281590386768' },
    { level: 80, roleId: '1570413279602544750' },
    { level: 85, roleId: '1570413278251716768' },
    { level: 100, roleId: '1570413277161193523' }, // "100+"
];

/**
 * Adds every milestone role the member has crossed but doesn't yet have.
 * Retain mode: never removes anything.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {number} level
 * @returns {Promise<string[]>} role IDs that were newly added
 */
async function grantRolesForLevel(member, level) {
    const toAdd = LEVEL_ROLES
        .filter(r => level >= r.level && !member.roles.cache.has(r.roleId))
        .map(r => r.roleId);

    if (!toAdd.length) return [];

    try {
        await member.roles.add(toAdd, `Reached level ${level}`);
        return toAdd;
    } catch (err) {
        console.error(`[roles] Failed to add roles to ${member.user.tag}:`, err.message);
        return [];
    }
}

/**
 * Returns the milestone table (for reuse in commands or tests).
 */
function milestones() {
    return LEVEL_ROLES.slice();
}

module.exports = { LEVEL_ROLES, grantRolesForLevel, milestones };