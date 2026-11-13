// import React, { useEffect, useRef, useState } from 'react';
// import {
//     Button,
//     Checkbox,
//     CircularProgress,
//     FormControlLabel,
//     Table,
//     TableBody,
//     TableCell,
//     TableHead,
//     TableRow,
//     TableSortLabel,
//     Typography
// } from '@mui/material';
// import { format } from 'date-fns';
// import { toast } from 'react-toastify';
// import { WebhookFormData } from '../models';
// import { Containers, DockerContainer, WebhookEvent, WebhookResponse } from '../../../shared/models/index';
// import ApiService from '../services/api.service.ts';
//
// const ContainersComponent: React.FC = () => {
//     const [containers, setContainers] = useState<Containers[]>([]);
//     const [order, setOrder] = useState<'asc' | 'desc'>('asc');
//     const [orderBy, setOrderBy] = useState<keyof DockerContainer>('Name');
//     const [isTest, setIsTest] = useState(true);
//     const [hardReset, setHardReset] = useState(false);
//     const [activeRow, setActiveRow] = useState<string | null>(null);
//     const [loading, setLoading] = useState(false);
//     const [numberOfRunningContainers, setNumberOfRunningContainers] = useState(0);
//     const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//     const fetchedRef = useRef(false); // Prevent double-fetch in dev
//
//     const CustomToastContent: React.FC<{ title: string; message: string, details?: string }> = ({ title, message, details }) => (
//         <div>
//             <strong>{title}</strong>
//             <div>{message}</div>
//             <div>{details}</div>
//         </div>
//     );
//
//     useEffect(() => {
//         if (fetchedRef.current) {
//             return;
//         }
//
//         fetchedRef.current = true;
//
//         const fetchContainers = async () => {
//             try {
//                 const response = await ApiService.getContainers();
//
//                 // Calculate the number of running containers
//                 const numberOfRunningContainers = response.reduce((acc, project) => {
//                     if (project.Project === '') {
//                         return acc + project.Containers.length;
//                     }
//
//                     return acc + project.Containers.length;
//                 }, 0);
//                
//                 setNumberOfRunningContainers(numberOfRunningContainers);
//                 setContainers(response);
//
//                 // Establish WebSocket connection
//                 const socket = new WebSocket('ws://localhost:4000/containers');
//
//                 socket.onmessage = (event) => {
//                     const updatedContainers = JSON.parse(event.data);
//
//                     setContainers(updatedContainers);
//                 };
//
//                 socket.onerror = (error) => {
//                     console.error('WebSocket Error:', error);
//                 };
//
//                 return () => {
//                     socket.close();
//                 };
//             } catch (err) {
//                 console.error('Failed to Get Containers:', err);
//             }
//         };
//
//         fetchContainers();
//     }, []);
//
//     const handleSort = (property: keyof DockerContainer) => {
//         const isAsc = orderBy === property && order === 'asc';
//
//         setOrder(isAsc ? 'desc' : 'asc');
//         setOrderBy(property);
//     };
//
//     const handleUpdateClick = (projectOrContainerId: string) => {
//         setActiveRow(projectOrContainerId);
//
//         if (timeoutRef.current) {
//             clearTimeout(timeoutRef.current);
//         }
//
//         timeoutRef.current = setTimeout(() => {
//             setActiveRow(null);
//         }, 10000);
//     };
//
//     const handleGoClick = async (projectOrContainerId: string, event: WebhookEvent) => {
//         setLoading(true);
//
//         try {
//             const data: WebhookFormData = {
//                 event: event,
//                 data: {
//                     projectOrContainerId: projectOrContainerId,
//                     hardReset: hardReset,
//                     isTest: isTest
//                 }
//             };
//
//             const response = await ApiService.post<WebhookResponse>('http://localhost:4000/webhook', data);
//
//             if (response.success) {
//                 toast.success((
//                     <CustomToastContent title={response.projectOrContainerId} message={response.message} />
//                 ));
//             } else {
//                 toast.error((
//                     <CustomToastContent title={projectOrContainerId} message="Failed to Restart..." details={response.details} />
//                 ));
//             }
//         } catch (err) {
//             toast.error('Update Failed...');
//
//             console.error('Error:', err);
//         } finally {
//             setLoading(false);
//             setActiveRow(null);
//         }
//     };
//
//     return (
//         <>
//             {numberOfRunningContainers == 0 ? (
//                 <Typography variant="h6" align="center">No Running Containers</Typography>
//             ) : (
//                 <Table>
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>
//                                 <TableSortLabel
//                                     active={orderBy === 'Name'}
//                                     direction={orderBy === 'Name' ? order : 'asc'}
//                                     onClick={() => handleSort('Name')}
//                                 >
//                                     Container
//                                 </TableSortLabel>
//                             </TableCell>
//                             <TableCell>
//                                 <TableSortLabel
//                                     active={orderBy === 'Image'}
//                                     direction={orderBy === 'Image' ? order : 'asc'}
//                                     onClick={() => handleSort('Image')}
//                                 >
//                                     Image
//                                 </TableSortLabel>
//                             </TableCell>
//                             <TableCell>
//                                 <TableSortLabel
//                                     active={orderBy === 'Version'}
//                                     direction={orderBy === 'Version' ? order : 'asc'}
//                                     onClick={() => handleSort('Version')}
//                                 >
//                                     Version
//                                 </TableSortLabel>
//                             </TableCell>
//                             <TableCell>
//                                 <TableSortLabel
//                                     active={orderBy === 'CreatedAt'}
//                                     direction={orderBy === 'CreatedAt' ? order : 'asc'}
//                                     onClick={() => handleSort('CreatedAt')}
//                                 >
//                                     Created
//                                 </TableSortLabel>
//                             </TableCell>
//                             <TableCell style={{ width: '270px' }}>Actions</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {containers.map((project, index) => (
//                             <React.Fragment key={index}>
//                                 <TableRow>
//                                     <TableCell colSpan={4}>
//                                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                                             <h2>{project.Project ? 'Project: ' + project.Project : 'Individual Containers'}</h2>
//                                         </div>
//                                     </TableCell>
//                                     <TableCell>
//                                         {project.Project && (
//                                             <div>
//                                                 {activeRow === project.Project ? (
//                                                     loading ? (
//                                                         <CircularProgress />
//                                                     ) : (
//                                                         <div>
//                                                             <FormControlLabel
//                                                                 control={
//                                                                     <Checkbox
//                                                                         checked={isTest}
//                                                                         onChange={(e) => setIsTest(e.target.checked)}
//                                                                         sx={{ color: 'primary.main' }}
//                                                                     />
//                                                                 }
//                                                                 label="Test"
//                                                             />
//                                                             <FormControlLabel
//                                                                 control={
//                                                                     <Checkbox
//                                                                         checked={hardReset}
//                                                                         onChange={(e) => setHardReset(e.target.checked)}
//                                                                         sx={{ color: 'primary.main' }}
//                                                                     />
//                                                                 }
//                                                                 label="Reset"
//                                                             />
//                                                             <Button
//                                                                 variant="contained"
//                                                                 color="secondary"
//                                                                 onClick={() => handleGoClick(project.Project, WebhookEvent.UpdateProject)}
//                                                             >
//                                                                 Go
//                                                             </Button>
//                                                         </div>
//                                                     )
//                                                 ) : (
//                                                     <Button
//                                                         variant="contained"
//                                                         color="primary"
//                                                         onClick={() => handleUpdateClick(project.Project)}
//                                                     >
//                                                         Update
//                                                     </Button>
//                                                 )}
//                                             </div>
//                                         )}
//                                     </TableCell>
//                                 </TableRow>
//                                 {project.Containers.map((container, index) => (
//                                     <TableRow key={index}>
//                                         <TableCell>
//                                             {container.Name}
//                                         </TableCell>
//                                         <TableCell>{container.Image}</TableCell>
//                                         <TableCell>{container.Version}</TableCell>
//                                         <TableCell>
//                                             {format(new Date(container.CreatedAt), 'yyyy.MM.dd @ HH.mm.ss')}
//                                         </TableCell>
//                                         <TableCell>
//                                             {!project.Project && (
//                                                 <div>
//                                                     {activeRow === container.Name ? (
//                                                         loading ? (
//                                                             <CircularProgress />
//                                                         ) : (
//                                                             <div>
//                                                                 <FormControlLabel
//                                                                     control={
//                                                                         <Checkbox
//                                                                             checked={isTest}
//                                                                             onChange={(e) => setIsTest(e.target.checked)}
//                                                                             sx={{ color: 'primary.main' }}
//                                                                         />
//                                                                     }
//                                                                     label="Test"
//                                                                 />
//                                                                 <FormControlLabel
//                                                                     control={
//                                                                         <Checkbox
//                                                                             checked={hardReset}
//                                                                             onChange={(e) => setHardReset(e.target.checked)}
//                                                                             sx={{ color: 'primary.main' }}
//                                                                         />
//                                                                     }
//                                                                     label="Reset"
//                                                                 />
//                                                                 <Button
//                                                                     variant="contained"
//                                                                     color="secondary"
//                                                                     onClick={() => handleGoClick(container.Name, WebhookEvent.UpdateContainer)}
//                                                                 >
//                                                                     Go
//                                                                 </Button>
//                                                             </div>
//                                                         )
//                                                     ) : (
//                                                         <Button
//                                                             variant="contained"
//                                                             color="primary"
//                                                             onClick={() => handleUpdateClick(container.Name)}
//                                                         >
//                                                             Update
//                                                         </Button>
//                                                     )}
//                                                 </div>
//                                             )}
//                                         </TableCell>
//                                     </TableRow>
//                                 ))}
//                             </React.Fragment>
//                         ))}
//                     </TableBody>
//                 </Table>
//             )}
//         </>
//     );
// };
//
// export default ContainersComponent;