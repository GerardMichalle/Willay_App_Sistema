-- La libreta pasa a poder representarse como un documento escaneado
-- (PDF o imagen) además del desglose de notas por curso, que se conserva.
ALTER TABLE libreta ADD COLUMN archivo_uuid UUID;
