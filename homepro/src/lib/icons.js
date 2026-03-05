import {
  faWrench, faBolt, faLeaf, faHouseChimney, faPaintRoller, faBroom,
  faHammer, faBug, faLayerGroup, faBlender, faTree, faTruck,
  faWarehouse, faWater, faGrip, faFan, faFaucetDrip,
  faClipboardList, faMagnifyingGlass, faComments, faTrophy,
  faPenToSquare, faLocationDot, faEnvelopeOpenText, faCircleDollarToSlot,
  faStar, faStarHalfStroke, faCheck, faXmark, faChevronRight,
  faChevronLeft, faSearch, faBars, faMoon, faSun, faPalette,
  faFont, faSliders, faUser, faEnvelope, faPhone, faBuilding,
  faShieldHalved, faDollarSign, faChartLine, faPlus, faMinus,
  faMapMarkerAlt, faArrowRight, faArrowLeft, faBell, faFilter,
  faSort, faEye, faCheckCircle, faTimesCircle, faSpinner,
  faHome, faGear, faSignOutAlt, faWindowRestore, faTableCells,
} from '@fortawesome/free-solid-svg-icons';

// Map DB icon_class strings → actual FA icon objects
export const ICON_MAP = {
  faWrench, faBolt, faLeaf, faHouseChimney, faPaintRoller, faBroom,
  faHammer, faBug, faLayerGroup, faBlender, faTree, faTruck,
  faWarehouse, faWater, faGrip, faFan, faFaucetDrip,
  faClipboardList, faMagnifyingGlass, faComments, faTrophy,
  faPenToSquare, faLocationDot, faEnvelopeOpenText, faCircleDollarToSlot,
  faStar, faStarHalfStroke, faCheck, faXmark, faChevronRight,
  faChevronLeft, faSearch, faBars, faMoon, faSun, faPalette,
  faFont, faSliders, faUser, faEnvelope, faPhone, faBuilding,
  faShieldHalved, faDollarSign, faChartLine, faPlus, faMinus,
  faMapMarkerAlt, faArrowRight, faArrowLeft, faBell, faFilter,
  faSort, faEye, faCheckCircle, faTimesCircle, faSpinner,
  faHome, faGear, faSignOutAlt, faWindowRestore, faTableCells,
};

export const getIcon = (name) => ICON_MAP[name] ?? faWrench;
