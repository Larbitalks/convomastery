import { api } from './api'
import { cleanAvatar } from './avatar'
import { campOfClass, journeyOf, staysOf, unlockedCount, type MapPerson, type Tier } from './discoveries'
import { expeditionOf, seriesOf, SUMMIT_POINTS } from './expedition'
import { crownedIds, withStarBonus } from './monthStar'

/** Everything the map needs about one student, from their awards and class moves */
function climber(log: { points: number; at: string }[], moves: { at: string; className: string; classLevel: string }[], camp: Tier, seed: string) {
  const stays = staysOf(moves)
  const j = journeyOf(log, stays, camp, seed)
  const e = expeditionOf(log, stays, camp, seed)
  return { camp, findsInCamp: j.unlocked.filter((u) => u.discovery.tier === camp).length, discoveries: j.unlocked.length, finds: j.unlocked, mountainId: e.mountain.id, steps: e.steps, cost: e.cost, summits: e.summits.length }
}

/** Teacher: every student, worked out exactly from their awards and class moves. Hidden students are included and marked. */
export async function teacherMapPeople(): Promise<(MapPerson & { hidden?: boolean })[]> {
  const [students, classes, awards, moves, stars] = await Promise.all([api.listStudents(), api.listClasses(), api.listAllAwards(), api.listClassMoves(), api.listMonthStars()])
  const crowns = crownedIds(stars)
  return students.map((s) => {
    const c = classes.find((x) => x.id === s.classId)
    const log = withStarBonus(awards.filter((a) => a.studentId === s.id).map((a) => ({ points: a.points, at: a.createdAt })), stars.filter((w) => w.studentId === s.id))
    return { key: s.id, name: s.name, avatar: s.avatar ?? null, hidden: s.showOnMap === false, crown: crowns.has(s.id), ...climber(log, moves.filter((m) => m.studentId === s.id), campOfClass(c?.name, c?.level), s.id) }
  })
}

/** Student or parent: everyone their teacher shows on the map, from their progress code */
export async function studentMapPeople(code: string): Promise<MapPerson[]> {
  const list = await api.getStudentMap(code)
  if (!list) throw new Error('This code does not work.')
  return list.map((p, i) => {
    const camp = campOfClass(p.className, p.classLevel)
    const base = { key: `p${i}`, name: p.name, avatar: cleanAvatar(p.avatar), me: p.me, crown: !!p.crown }
    // Newer servers send the award history, so the exact collection and position can be shown
    if (p.log) return { ...base, ...climber(p.log, p.moves ?? [], camp, p.seed ?? p.name) }
    const n = Math.max(0, unlockedCount(p.total) - unlockedCount(p.atMove))
    return { ...base, camp, findsInCamp: n, discoveries: unlockedCount(p.total), mountainId: seriesOf(camp)[0].id, steps: Math.min(SUMMIT_POINTS[camp] - 1, p.total - p.atMove), cost: SUMMIT_POINTS[camp] }
  })
}
