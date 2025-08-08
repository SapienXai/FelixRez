-- Ensure admins can view all reservations
DROP POLICY IF EXISTS "Admins can view all reservations" ON reservations;

CREATE POLICY "Admins can view all reservations" 
ON reservations FOR SELECT 
TO authenticated
USING (true);

-- Ensure admins can update reservations
DROP POLICY IF EXISTS "Admins can update reservations" ON reservations;

CREATE POLICY "Admins can update reservations" 
ON reservations FOR UPDATE 
TO authenticated
USING (true);
