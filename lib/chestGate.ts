/**
 * Chest claims are rewards, not a tap. A claim is eligible only when every
 * block in the unit is complete and that unit's chest has not already been
 * claimed. The award is recorded separately so a failed database write can
 * never start the celebration.
 *
 * The chest ceremony and the five-second <Celebration /> both consume this
 * predicate, so an ineligible or unawarded claim cannot hand off to the storm.
 */
export interface ChestClaim {
  unitComplete: boolean;
  alreadyClaimed: boolean;
  awarded: boolean;
}

/** Eligibility check: the unit is finished and the chest is still unclaimed. */
export function canClaimChest(
  claim: Pick<ChestClaim, 'unitComplete' | 'alreadyClaimed'> | null | undefined
): boolean {
  return !!claim && claim.unitComplete && !claim.alreadyClaimed;
}

/** True only after an eligible claim was actually awarded. */
export function shouldCelebrateChest(claim: ChestClaim | null | undefined): boolean {
  return !!claim && claim.awarded === true && canClaimChest(claim);
}
