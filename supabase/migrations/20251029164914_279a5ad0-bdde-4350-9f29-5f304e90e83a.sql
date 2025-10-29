-- Make the wager-proofs bucket truly public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'wager-proofs';