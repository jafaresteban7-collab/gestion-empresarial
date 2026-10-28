# Manual de usuario · GestiónPro

GestiónPro es una aplicación web progresiva (PWA) para gestionar el inventario de productos y consultar los pedidos de la empresa. Funciona en móvil, tablet y ordenador, y puede instalarse como aplicación desde el navegador.

> El mismo manual está disponible dentro de la aplicación en **Menú → Ayuda**. Cada pantalla tiene un botón **?** en la barra superior que abre directamente la sección correspondiente.

## Índice

1. [Roles](#1-roles)
2. [Acceso a la aplicación](#2-acceso-a-la-aplicación)
3. [Navegación](#3-navegación)
4. [Página de inicio](#4-página-de-inicio)
5. [Cuadro de mando (Administrador)](#5-cuadro-de-mando-administrador)
6. [Productos](#6-productos)
7. [Actividad en tiempo real](#7-actividad-en-tiempo-real)
8. [Usuarios (Administrador)](#8-usuarios-administrador)
9. [Exportar informes PDF y CSV](#9-exportar-informes-pdf-y-csv)
10. [Accesibilidad y teclado](#10-accesibilidad-y-teclado)
11. [Instalar la aplicación (PWA)](#11-instalar-la-aplicación-pwa)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

## 1. Roles

| Función | Administrador | Usuario estándar |
| --- | :---: | :---: |
| Página de inicio | ✔ | ✔ |
| Cuadro de mando con gráficos | ✔ | ✖ |
| Consultar y buscar productos | ✔ | ✔ |
| Crear, editar y eliminar productos | ✔ | ✖ |
| Actividad de pedidos en tiempo real | ✔ | ✔ |
| Exportar informes PDF/CSV | ✔ | ✔ |
| Listado de usuarios | ✔ | ✖ |

Si un usuario intenta abrir una sección no permitida (por ejemplo escribiendo la dirección), se muestra la pantalla **Acceso denegado**.

## 2. Acceso a la aplicación

1. Abra la dirección de la aplicación.
2. Escriba su **correo electrónico** y **contraseña** y pulse **Entrar**. El icono del ojo muestra u oculta la contraseña.
3. Marque **Recordar mi correo** si no quiere volver a escribirlo en ese dispositivo.

**Crear una cuenta (usuario estándar):** pulse «Cree una cuenta de usuario» y rellene el formulario:

- Mientras escribe el correo, la aplicación comprueba si ya está registrado y lo indica («Comprobando disponibilidad…», «Correo disponible» o «Este correo ya está registrado»).
- La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula, número y símbolo.

**Sesión:** por seguridad caduca a la hora; la aplicación le devolverá al inicio de sesión con un aviso. Para salir, use **Cerrar sesión** al final del menú.

## 3. Navegación

- **Ordenador:** el menú lateral está siempre visible a la izquierda.
- **Móvil y tablet:** pulse el icono ☰ de la barra superior para abrir el menú.
- El botón **?** de cada pantalla abre la ayuda de esa sección.

## 4. Página de inicio

Resumen con: número de productos, valor total del inventario, productos con stock bajo (menos de 10 unidades) y pedidos del día (se actualiza en tiempo real). Incluye accesos directos a las secciones más usadas.

## 5. Cuadro de mando (Administrador)

- **Periodo:** 7, 30 o 90 días. Los indicadores muestran la variación frente al periodo anterior equivalente (flecha verde = aumento, roja = descenso).
- **Filtros:** categoría y estado del pedido. Todos los indicadores y gráficos se recalculan al instante.
- **Interacción con gráficos:** pulse un sector del gráfico «Ingresos por categoría» para filtrar por esa categoría; púlselo de nuevo para quitar el filtro.
- **Indicador «Pendientes de envío»:** púlselo para ver solo los pedidos pendientes.
- **Limpiar filtros:** vuelve a la vista de 30 días sin filtros.
- **Informe PDF / CSV:** descarga el consolidado de ventas por categoría con los filtros aplicados.
- El aviso «Datos en tiempo real» indica la hora de la última actualización recibida.

## 6. Productos

- **Buscar:** escriba en el buscador; busca en todas las columnas e ignora tildes y mayúsculas.
- **Ordenar:** pulse el título de una columna; púlselo otra vez para invertir el orden.
- **Filtrar:** por categoría o activando «Solo stock bajo».
- **Paginación:** botones «Anterior» y «Siguiente» bajo la tabla.

Solo **Administrador**:

- **Nuevo producto:** botón en la parte superior. El **SKU** debe tener el formato `AA-000` (por ejemplo `HW-010`) y ser único; se comprueba mientras escribe. Active «Seguir añadiendo productos» para dar de alta varios seguidos.
- **Editar:** icono de lápiz en la fila.
- **Eliminar:** icono de papelera; se pide confirmación.

## 7. Actividad en tiempo real

Muestra los pedidos según se registran (otros puestos de la empresa los crean continuamente). El pedido más reciente aparece arriba y se anuncia con un aviso. Puede filtrar por estado, buscar y exportar el listado.

## 8. Usuarios (Administrador)

Listado de los usuarios registrados con su departamento, rol y fecha de alta, con búsqueda y ordenación.

## 9. Exportar informes PDF y CSV

- Se exporta **exactamente lo que se ve** en la tabla: búsqueda, filtros y orden aplicados (todas las páginas).
- **CSV:** se abre con Excel o LibreOffice (separador punto y coma, codificación UTF-8).
- **PDF:** informe con cabecera corporativa, fecha, autor, bloque de resumen, tabla y número de página.

## 10. Accesibilidad y teclado

| Tecla | Acción |
| --- | --- |
| `Tab` / `Mayús + Tab` | Avanzar / retroceder entre elementos |
| `Intro` / `Espacio` | Activar botones, enlaces, casillas e interruptores |
| `Esc` | Cerrar menús desplegables y diálogos |

- El primer elemento de cada pantalla es el enlace **«Saltar al contenido principal»**.
- El foco siempre es visible (contorno azul).
- Los textos se adaptan al tamaño de letra y zoom del navegador (hasta el 200 %).
- Los gráficos tienen una descripción y una tabla de datos equivalente para lectores de pantalla.
- Los mensajes de carga, error y los avisos en tiempo real se anuncian a los lectores de pantalla.
- Los colores cumplen el contraste mínimo WCAG 2.1 AA.

## 11. Instalar la aplicación (PWA)

- **Ordenador (Chrome/Edge):** icono de instalación en la barra de direcciones.
- **Android:** menú del navegador → «Instalar aplicación».
- **iPhone/iPad (Safari):** Compartir → «Añadir a pantalla de inicio».

## 12. Preguntas frecuentes

**No veo el cuadro de mando.** Solo está disponible para el rol Administrador.

**Me aparece «Su sesión ha caducado».** La sesión dura una hora por seguridad. Vuelva a iniciar sesión.

**¿Los datos son reales?** No. Todos los datos (productos, pedidos y usuarios) son sintéticos y no contienen información personal real.

**He borrado un producto por error.** Los cambios se guardan en el navegador. Para restaurar los datos de ejemplo, borre los datos del sitio en la configuración del navegador.
