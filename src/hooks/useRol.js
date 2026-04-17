/**
 * useRol — hook centralizado de detección de rol
 *
 * Lógica:
 *   1. Escucha onAuthStateChanged
 *   2. Si no hay usuario → { user: null, rol: null, docId: null, cargando: false }
 *   3. Si hay usuario → busca su uid en colección "lideres"
 *      · Si existe → rol = "lider"
 *      · Si no     → busca en "practicantes"
 *        · Si existe → rol = "practicante"
 *        · Si no     → rol = "practicante" (usuario nuevo sin doc aún)
 *
 * NO se usa el dominio del correo para determinar el rol.
 * Los líderes son insertados manualmente por administración.
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export function useRol() {
  const [user,     setUser]     = useState(undefined); // undefined = aún cargando
  const [rol,      setRol]      = useState(null);      // "lider" | "practicante" | null
  const [docId,    setDocId]    = useState(null);      // id del doc en Firestore
  const [favIds,   setFavIds]   = useState([]);        // solo si es líder
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRol(null);
        setDocId(null);
        setFavIds([]);
        setCargando(false);
        return;
      }

      setUser(u);

      try {
        /* 1. ¿Es líder? */
        const lSnap = await getDocs(
          query(collection(db, "lideres"), where("uid", "==", u.uid))
        );

        if (!lSnap.empty) {
          const d = lSnap.docs[0];
          setRol("lider");
          setDocId(d.id);
          setFavIds(d.data().favoritos || []);
          setCargando(false);
          return;
        }

        /* 2. ¿Es practicante? */
        const pSnap = await getDocs(
          query(collection(db, "practicantes"), where("uid", "==", u.uid))
        );

        if (!pSnap.empty) {
          setRol("practicante");
          setDocId(pSnap.docs[0].id);
        } else {
          /* usuario autenticado pero sin doc (raro) — tratamos como practicante */
          setRol("practicante");
          setDocId(null);
        }
      } catch (e) {
        console.error("useRol error:", e);
        setRol("practicante");
      } finally {
        setCargando(false);
      }
    });

    return () => unsub();
  }, []);

  return { user, rol, docId, favIds, setFavIds, cargando };
}
